
-- Reset existing inquiries policies
DROP POLICY IF EXISTS "admins delete inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "admins read inquiries"   ON public.inquiries;
DROP POLICY IF EXISTS "anyone can submit inquiry" ON public.inquiries;

-- Public (anon + authenticated) can submit an inquiry, with length checks
CREATE POLICY "public can submit inquiry"
ON public.inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(name)  BETWEEN 1 AND 100
  AND char_length(phone) BETWEEN 4 AND 20
  AND (email   IS NULL OR char_length(email)   <= 255)
  AND (interest IS NULL OR char_length(interest) <= 50)
  AND (message IS NULL OR char_length(message) <= 1000)
);

-- Only signed-in admins can read inquiries
CREATE POLICY "admins read inquiries"
ON public.inquiries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only signed-in admins can delete inquiries
CREATE POLICY "admins delete inquiries"
ON public.inquiries
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Make sure grants line up with the new policies
GRANT INSERT ON public.inquiries TO anon;
GRANT SELECT, INSERT, DELETE ON public.inquiries TO authenticated;
GRANT ALL ON public.inquiries TO service_role;
